import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Save from 'lucide-react/dist/esm/icons/save';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Loader from 'lucide-react/dist/esm/icons/loader';
import Star from 'lucide-react/dist/esm/icons/star';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Move from 'lucide-react/dist/esm/icons/move';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { cn } from '../../lib/utils';
import StudioSelect from '../../components/ui/StudioSelect';

const FormBuilder = () => {
    useStoreSubscription(['forms']);
    const colorPresets = [
        { name: 'Neon Pink', value: '#FF4F8B' },
        { name: 'Neon Green', value: '#39FF14' },
        { name: 'Electric Purple', value: '#BF00FF' },
        { name: 'Cyber Blue', value: '#2ebfff' },
    ];

    const { id } = useParams();
    const navigate = useNavigate();
    const { forms, addForm, updateForm, uploadToCloudinary } = useStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [activeLabel, setActiveLabel] = useState('Live');
    const [bottomText, setBottomText] = useState('');
    const [buttonText, setButtonText] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [requiresExternal, setRequiresExternal] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [previewType, setPreviewType] = useState('card');
    const [image, setImage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [highlightColor, setHighlightColor] = useState('#FF4F8B');
    const [isPinned, setIsPinned] = useState(false);
    const [imageTransform, setImageTransform] = useState({ scale: 1.05, x: 0, y: 0 });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id) {
            const form = forms.find(f => f.id === id);
            if (form) {
                setTitle(form.title);
                setDescription(form.description);
                setActiveLabel(form.activeLabel || 'Live');
                setBottomText(form.bottomText || '');
                setButtonText(form.buttonText || '');
                setFormUrl(form.formUrl || '');
                setRequiresExternal(form.requiresExternal || false);
                setImage(form.image || '');
                setHighlightColor(form.highlightColor || '#FF4F8B');
                setIsPinned(form.isPinned || false);
                setImageTransform(form.imageTransform || { scale: 1.05, x: 0, y: 0 });
            }
        }
    }, [id, forms]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            if (url) {
                setImage(url);
            }
        } catch (error) {
            console.error("Upload failed:", error);
            useStore.getState().addToast("Couldn't upload the image. Please try again.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);

        let cleanUrl = formUrl;
        if (formUrl.includes('<iframe')) {
            const srcMatch = formUrl.match(/src="([^"]+)"/);
            if (srcMatch && srcMatch[1]) {
                cleanUrl = srcMatch[1];
            }
        }

        const formData = {
            title,
            description,
            activeLabel,
            bottomText,
            buttonText,
            formUrl: cleanUrl,
            requiresExternal,
            image,
            highlightColor,
            isPinned,
            imageTransform,
            updatedAt: new Date().toISOString()
        };

        try {
            if (id) {
                await updateForm(id, formData);
            } else {
                await addForm({
                    ...formData,
                    createdAt: new Date().toISOString()
                });
                await notifyAllUsers(
                    `NEW FORM: ${formData.title.toUpperCase()}`,
                    `Please take a moment to review and complete our latest form.`,
                    '/forms',
                    formData.image,
                    true // sendEmail
                );
            }
            navigate('/admin/forms');
            useStore.getState().addToast(`Form ${id ? 'updated' : 'created'} successfully!`, 'success');
        } catch (error) {
            console.error("Error saving form:", error);
            useStore.getState().addToast("Failed to save form. Please try again.", 'error');
        } finally {
            setSaving(false);
        }
    };

    // Section wrapper for visual grouping
    const Section = ({ title, icon: Icon, children, accent = false }) => (
        <div className={cn(
            "rounded-[1.5rem] border p-6 md:p-8 space-y-6 transition-all duration-300",
            accent 
                ? "bg-neon-pink/[0.03] border-neon-pink/10 hover:border-neon-pink/20" 
                : "bg-white dark:bg-black/30 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
        )}>
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        accent ? "bg-neon-pink/10 text-neon-pink" : "bg-black/5 dark:bg-white/5 text-gray-500"
                    )}>
                        <Icon size={14} />
                    </div>
                )}
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</h3>
            </div>
            {children}
        </div>
    );

    return (
        <AdminCommunityHubLayout 
            hideTabs 
            accentColor="neon-pink"
            studioHeader={{
                title: "FORM",
                subtitle: id ? "EDITOR" : "CREATOR",
                accentClass: "text-neon-pink"
            }}
        >
            <div className="flex flex-col lg:grid lg:grid-cols-[1fr,420px] gap-8 lg:gap-12 items-start mb-20 relative z-10">
                {/* Editor Column */}
                <div className="w-full space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Basic Info */}
                        <Section title="Basic Information" icon={FileText}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Title</label>
                                    <Input 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)} 
                                        required 
                                        placeholder="e.g. Join The Tribe"
                                        className="h-12 bg-gray-50 dark:bg-black/40 border-black/5 dark:border-white/5 rounded-xl px-4 text-sm font-semibold focus:border-neon-pink/40" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Status</label>
                                    <StudioSelect
                                        value={activeLabel}
                                        options={[
                                            { value: 'Live', label: 'LIVE' },
                                            { value: 'Few Slots Remain', label: 'FILLING FAST' },
                                            { value: 'Closed', label: 'CLOSED' }
                                        ]}
                                        onChange={val => setActiveLabel(val)}
                                        className="h-12"
                                        accentColor="neon-pink"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Description</label>
                                <textarea 
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-xl p-4 text-gray-900 dark:text-white focus:outline-none focus:border-neon-pink/30 min-h-[100px] resize-none text-sm font-medium placeholder:text-gray-400 dark:placeholder:text-gray-600 leading-relaxed transition-colors" 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                    placeholder="Brief description of this form..." 
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Location Label</label>
                                    <Input 
                                        value={bottomText} 
                                        onChange={e => setBottomText(e.target.value)} 
                                        placeholder="e.g. Global Access"
                                        className="h-12 bg-gray-50 dark:bg-black/40 border-black/5 dark:border-white/5 rounded-xl px-4 text-sm font-semibold focus:border-neon-pink/40" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Button Text</label>
                                    <Input 
                                        value={buttonText} 
                                        onChange={e => setButtonText(e.target.value)} 
                                        placeholder="e.g. Fill Form"
                                        className="h-12 bg-gray-50 dark:bg-black/40 border-black/5 dark:border-white/5 rounded-xl px-4 text-sm font-semibold focus:border-neon-pink/40" 
                                    />
                                </div>
                            </div>
                        </Section>

                        {/* Form Link */}
                        <Section title="Google Form Link" icon={Link2} accent>
                            <div className="flex justify-between items-center -mt-2">
                                <p className="text-[10px] font-medium text-gray-500 tracking-wide">Paste your Google Form URL or embed code</p>
                                <button
                                    type="button"
                                    onClick={() => setShowHelp(!showHelp)}
                                    className="text-[9px] font-bold text-neon-pink hover:text-gray-900 dark:hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                >
                                    <HelpCircle size={12} /> How to get URL
                                </button>
                            </div>

                            {showHelp && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/40 p-5 rounded-xl border border-black/5 dark:border-white/5 space-y-2">
                                    <ol className="list-decimal pl-4 space-y-1.5">
                                        <li>Open your Google Form in edit mode.</li>
                                        <li>Click the <strong className="text-gray-900 dark:text-white">Send</strong> button.</li>
                                        <li>Click the <strong className="text-gray-900 dark:text-white">&lt; &gt;</strong> (Embed) tab.</li>
                                        <li>Copy the URL inside <code className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded text-[10px]">src="..."</code> or paste the full embed code.</li>
                                    </ol>
                                </div>
                            )}

                            <Input
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                required
                                placeholder="https://docs.google.com/forms/d/e/.../viewform"
                                className="h-12 font-mono text-xs bg-gray-50 dark:bg-black/40 border-black/5 dark:border-white/5 rounded-xl px-4 focus:border-neon-pink/40"
                            />

                            <label className="flex items-center gap-4 p-4 rounded-xl border border-black/5 dark:border-white/5 bg-gray-50 dark:bg-black/20 cursor-pointer hover:border-black/10 dark:hover:border-white/10 transition-all group">
                                <input
                                    type="checkbox"
                                    checked={requiresExternal}
                                    onChange={(e) => setRequiresExternal(e.target.checked)}
                                    className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-neon-pink focus:ring-neon-pink bg-white dark:bg-black/60 cursor-pointer"
                                />
                                <div className="flex-1">
                                    <span className="text-xs text-gray-900 dark:text-white font-bold flex items-center gap-2">
                                        Open externally <ExternalLink className="h-3 w-3 text-gray-400" />
                                    </span>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        Required for forms with file uploads or forced Google login.
                                    </p>
                                </div>
                            </label>
                        </Section>

                        {/* Appearance */}
                        <Section title="Appearance" icon={ImageIcon}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Cover Image</label>
                                <div className="flex gap-3">
                                    <Input 
                                        value={image} 
                                        onChange={e => setImage(e.target.value)} 
                                        placeholder="Paste image URL" 
                                        className="flex-1 h-12 bg-gray-50 dark:bg-black/40 border-black/5 dark:border-white/5 rounded-xl px-4 text-sm focus:border-neon-pink/40" 
                                    />
                                    <div className="relative group w-12 h-12 shrink-0">
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                        <div className={cn(
                                            "h-full w-full rounded-xl flex items-center justify-center border-2 border-dashed transition-all", 
                                            isUploading ? "border-neon-pink bg-neon-pink/10 text-neon-pink" : "border-black/10 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-gray-400 hover:border-black/20 dark:hover:border-white/20 hover:text-gray-600"
                                        )}>
                                            {isUploading ? <Loader className="animate-spin" size={16} /> : <Plus size={16} />}
                                        </div>
                                    </div>
                                </div>
                                {image && (
                                    <div className="relative mt-2 h-32 rounded-xl overflow-hidden border border-black/5 dark:border-white/5">
                                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                            type="button" 
                                            onClick={() => setImage('')}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] pl-1">Accent Color</label>
                                <div className="flex items-center gap-3 h-12 bg-gray-50 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-xl px-4">
                                    {colorPresets.map(color => (
                                        <button 
                                            key={color.value} 
                                            type="button" 
                                            onClick={() => setHighlightColor(color.value)} 
                                            className={cn(
                                                "w-7 h-7 rounded-full border-2 transition-all hover:scale-110", 
                                                highlightColor === color.value 
                                                    ? "border-gray-900 dark:border-white scale-110 shadow-lg" 
                                                    : "border-transparent opacity-60 hover:opacity-100"
                                            )} 
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        />
                                    ))}
                                    <div className="ml-auto flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: highlightColor }} />
                                        <span className="text-[10px] font-mono text-gray-500">{highlightColor}</span>
                                    </div>
                                </div>
                            </div>
                        </Section>

                        {/* Image Position */}
                        {image && (
                            <Section title="Image Position" icon={Move}>
                                <div className="flex items-center justify-end -mt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setImageTransform({ scale: 1.05, x: 0, y: 0 })} 
                                        className="text-[9px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                    >
                                        <X size={10} /> Reset
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Zoom</label>
                                            <span className="text-[9px] font-mono text-neon-pink">{imageTransform.scale.toFixed(2)}x</span>
                                        </div>
                                        <input type="range" min="-3" max="3" step="0.01" value={imageTransform.scale} onChange={e => setImageTransform({ ...imageTransform, scale: parseFloat(e.target.value) })} className="w-full accent-neon-pink" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">X</label>
                                            <span className="text-[9px] font-mono text-neon-pink">{imageTransform.x}%</span>
                                        </div>
                                        <input type="range" min="-100" max="100" step="1" value={imageTransform.x} onChange={e => setImageTransform({ ...imageTransform, x: parseInt(e.target.value) })} className="w-full accent-neon-pink" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Y</label>
                                            <span className="text-[9px] font-mono text-neon-pink">{imageTransform.y}%</span>
                                        </div>
                                        <input type="range" min="-100" max="100" step="1" value={imageTransform.y} onChange={e => setImageTransform({ ...imageTransform, y: parseInt(e.target.value) })} className="w-full accent-neon-pink" />
                                    </div>
                                </div>
                            </Section>
                        )}

                        {/* Spotlight Toggle */}
                        <div className={cn(
                            "rounded-[1.5rem] border p-5 flex items-center justify-between transition-all duration-500", 
                            isPinned ? "bg-neon-pink/[0.06] border-neon-pink/20" : "bg-white dark:bg-black/30 border-black/5 dark:border-white/5"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500", 
                                    isPinned ? "bg-neon-pink text-black" : "bg-black/5 dark:bg-white/5 text-gray-500"
                                )}>
                                    <Star size={18} className={cn(isPinned && "fill-current")} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Feature as Spotlight</h4>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Pin to the featured section at top of community</p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsPinned(!isPinned)} 
                                className={cn("w-11 h-6 rounded-full relative transition-all", isPinned ? "bg-neon-pink" : "bg-black/10 dark:bg-white/10")}
                            >
                                <div className={cn("absolute top-1 w-4 h-4 rounded-full transition-all shadow", isPinned ? "right-1 bg-white" : "left-1 bg-gray-400 dark:bg-gray-600")} />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-black/5 dark:border-white/5">
                            <Link to="/admin/forms">
                                <Button type="button" variant="outline" className="h-12 rounded-xl px-8 text-[10px] font-bold uppercase tracking-widest border-black/10 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 w-full sm:w-auto">Cancel</Button>
                            </Link>
                            <Button 
                                onClick={handleSubmit} 
                                disabled={saving}
                                className="h-12 px-10 bg-neon-pink text-black font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_10px_30px_rgba(255,79,139,0.2)] hover:shadow-[0_15px_40px_rgba(255,79,139,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all border-none flex items-center justify-center gap-3"
                            >
                                {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                                {id ? 'Update Form' : 'Create Form'}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Preview Column */}
                <div className="lg:sticky lg:top-32 space-y-4 w-full">
                    <div className="flex bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/5 p-1 rounded-xl w-fit">
                        <button 
                            onClick={() => setPreviewType('card')}
                            className={cn(
                                "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                previewType === 'card' ? "bg-neon-pink text-black shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Card
                        </button>
                        <button 
                            onClick={() => setPreviewType('embed')}
                            className={cn(
                                "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                previewType === 'embed' ? "bg-neon-pink text-black shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Embed
                        </button>
                    </div>

                    <div className="pt-2">
                        {previewType === 'card' ? (
                            <LivePreview 
                                type="form" 
                                data={{ title, description, activeLabel, bottomText, buttonText, image, highlightColor, isPinned, imageTransform }} 
                                hideDecorations={false} 
                            />
                        ) : (
                            <LivePreview 
                                type="form_embed" 
                                data={{ formUrl, requiresExternal }} 
                                hideDecorations={false} 
                            />
                        )}
                    </div>
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default FormBuilder;
