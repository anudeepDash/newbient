import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Save from 'lucide-react/dist/esm/icons/save';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Palette from 'lucide-react/dist/esm/icons/palette';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import Pin from 'lucide-react/dist/esm/icons/pin';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Loader from 'lucide-react/dist/esm/icons/loader';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Star from 'lucide-react/dist/esm/icons/star';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { cn } from '../../lib/utils';
import StudioSelect from '../../components/ui/StudioSelect';

const FormBuilder = () => {
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
            useStore.getState().addToast("UPLOAD FAILED. PLEASE TRY AGAIN.", 'error');
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

    return (
        <AdminCommunityHubLayout 
            hideTabs 
            studioHeader={{
                title: "FORM",
                subtitle: id ? "EDITOR" : "CREATOR",
                accentClass: "text-neon-pink"
            }}
        >
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-start mb-20 relative z-10">
                {/* Editor Column */}
                <div className="w-full">
                    <Card className="p-8 md:p-12 bg-zinc-950/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        {/* Ambient Background Glow */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-neon-pink/5 rounded-full blur-[100px] pointer-events-none" />
                        
                        <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">TITLE</label>
                                        <Input 
                                            value={title} 
                                            onChange={e => setTitle(e.target.value)} 
                                            required 
                                            placeholder="e.g. JOIN THE TRIBE"
                                            className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-pink/40" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">STATUS</label>
                                        <StudioSelect
                                            value={activeLabel}
                                            options={[
                                                { value: 'Live', label: 'LIVE' },
                                                { value: 'Few Slots Remain', label: 'FILLING FAST' },
                                                { value: 'Closed', label: 'CLOSED' }
                                            ]}
                                            onChange={val => setActiveLabel(val)}
                                            className="h-14"
                                            accentColor="neon-pink"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">LABEL</label>
                                        <Input 
                                            value={bottomText} 
                                            onChange={e => setBottomText(e.target.value)} 
                                            placeholder="e.g. GLOBAL ACCESS"
                                            className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-pink/40" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">BUTTON TEXT</label>
                                        <Input 
                                            value={buttonText} 
                                            onChange={e => setButtonText(e.target.value)} 
                                            placeholder="e.g. FILL FORM"
                                            className="h-14 bg-black/60 border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-pink/40" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">DESCRIPTION</label>
                                    <textarea 
                                        className="w-full bg-black/60 border border-white/5 rounded-[1.5rem] p-8 text-white focus:outline-none focus:border-neon-pink/40 min-h-[150px] resize-none text-[13px] font-medium placeholder:text-gray-800 leading-relaxed italic shadow-inner" 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)} 
                                        placeholder="Brief details..." 
                                    />
                                </div>

                                <div className="p-8 rounded-[2rem] bg-black/40 border border-white/5 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-neon-pink uppercase tracking-[0.3em]">FORM LINK (URL)</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowHelp(!showHelp)}
                                            className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2 underline"
                                        >
                                            <HelpCircle size={12} /> GUIDE
                                        </button>
                                    </div>

                                    {showHelp && (
                                        <div className="text-[11px] text-gray-400 bg-black/60 p-6 rounded-2xl border border-white/10 uppercase tracking-widest leading-loose italic">
                                            <ol className="list-decimal pl-4 space-y-2">
                                                <li>Open your Google Form in edit mode.</li>
                                                <li>Click the <strong className="text-white">Send</strong> button.</li>
                                                <li>Click the <strong className="text-white">&lt; &gt;</strong> (Embed) tab.</li>
                                                <li>Copy the URL inside <code>src="..."</code>.</li>
                                            </ol>
                                        </div>
                                    )}

                                    <Input
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                        required
                                        placeholder="HTTPS://DOCS.GOOGLE.COM/FORMS/D/E/.../VIEWFORM"
                                        className="h-14 font-mono text-[10px] bg-black/60 border-white/5 rounded-2xl px-6 focus:border-neon-pink/40"
                                    />

                                    <div className="flex items-start gap-4 p-6 rounded-2xl border border-white/5 bg-black/40 group hover:border-white/10 transition-all">
                                        <input
                                            type="checkbox"
                                            id="requiresExternal"
                                            checked={requiresExternal}
                                            onChange={(e) => setRequiresExternal(e.target.checked)}
                                            className="mt-1 w-5 h-5 rounded border-white/10 text-neon-pink focus:ring-neon-pink bg-black/60"
                                        />
                                        <div>
                                            <label htmlFor="requiresExternal" className="text-[11px] text-white font-black uppercase tracking-widest cursor-pointer flex items-center gap-2">
                                                EXTERNAL REDIRECT
                                                <ExternalLink className="h-3 w-3 text-gray-500" />
                                            </label>
                                            <p className="text-[9px] uppercase font-bold tracking-widest text-gray-600 mt-1">
                                                Open in new tab. Required for <span className="text-white">File Uploads</span> or <span className="text-white">Forced Login</span>.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8 pt-6 border-t border-white/5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">IMAGE</label>
                                            <div className="flex gap-4">
                                                <Input 
                                                    value={image} 
                                                    onChange={e => setImage(e.target.value)} 
                                                    placeholder="URL" 
                                                    className="flex-1 h-14 bg-black/60 border-white/5 rounded-2xl focus:border-neon-pink/40" 
                                                />
                                                <div className="relative group w-14 h-14 shrink-0">
                                                    <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                    <div className={cn(
                                                        "h-full w-full rounded-2xl flex items-center justify-center border-2 border-dashed transition-all", 
                                                        isUploading ? "border-neon-pink bg-neon-pink/10 text-neon-pink" : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20"
                                                    )}>
                                                        {isUploading ? <Loader className="animate-spin" size={18} /> : <Plus size={18} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] pl-1">HIGHLIGHT COLOR</label>
                                            <div className="flex items-center gap-4 h-14 bg-black/60 border border-white/5 rounded-2xl px-6">
                                                {colorPresets.map(color => (
                                                    <button 
                                                        key={color.value} 
                                                        type="button" 
                                                        onClick={() => setHighlightColor(color.value)} 
                                                        className={cn(
                                                            "w-6 h-6 rounded-full border-2 transition-all hover:scale-110", 
                                                            highlightColor === color.value ? "border-white shadow-[0_0_15px_rgba(255,79,139,0.4)]" : "border-black/50"
                                                        )} 
                                                        style={{ backgroundColor: color.value }} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2rem] bg-black/40 border border-white/5 space-y-10">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-pink italic">IMAGE POSITION</h4>
                                        <button 
                                            type="button" 
                                            onClick={() => setImageTransform({ scale: 1.05, x: 0, y: 0 })} 
                                            className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                                        >
                                            <X size={12} /> RESET
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-2">
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">ZOOM</label>
                                                <span className="text-[9px] font-mono text-neon-pink">{imageTransform.scale.toFixed(2)}x</span>
                                            </div>
                                            <input type="range" min="0.5" max="2.5" step="0.01" value={imageTransform.scale} onChange={e => setImageTransform({ ...imageTransform, scale: parseFloat(e.target.value) })} className="w-full accent-neon-pink" />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">X</label>
                                                <span className="text-[9px] font-mono text-neon-pink">{imageTransform.x}%</span>
                                            </div>
                                            <input type="range" min="-100" max="100" step="1" value={imageTransform.x} onChange={e => setImageTransform({ ...imageTransform, x: parseInt(e.target.value) })} className="w-full accent-neon-pink" />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Y</label>
                                                <span className="text-[9px] font-mono text-neon-pink">{imageTransform.y}%</span>
                                            </div>
                                            <input type="range" min="-100" max="100" step="1" value={imageTransform.y} onChange={e => setImageTransform({ ...imageTransform, y: parseInt(e.target.value) })} className="w-full accent-neon-pink" />
                                        </div>
                                    </div>
                                </div>

                                <div className={cn(
                                    "p-8 rounded-[2rem] border flex items-center justify-between transition-all duration-500 mt-auto", 
                                    isPinned ? "bg-neon-pink/10 border-neon-pink/40 shadow-[0_0_40px_rgba(255,79,139,0.05)]" : "bg-black/40 border-white/5"
                                )}>
                                    <div className="flex items-center gap-8">
                                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl", isPinned ? "bg-neon-pink text-black" : "bg-white/5 text-gray-600")}>
                                            <Star size={24} className={cn(isPinned && "fill-current")} />
                                        </div>
                                        <div>
                                            <h4 className="text-white text-sm font-black uppercase tracking-widest italic leading-tight">FEATURE AS SPOTLIGHT</h4>
                                            <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-[0.1em]">SHOW IN THE FEATURED SECTION AT TOP</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsPinned(!isPinned)} 
                                        className={cn("w-14 h-8 rounded-full relative transition-all border-2", isPinned ? "bg-neon-pink border-neon-pink" : "bg-black/60 border-white/10")}
                                    >
                                        <div className={cn("absolute top-1 w-5 h-5 rounded-full transition-all shadow-lg", isPinned ? "right-1 bg-black" : "left-1 bg-gray-600")} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-12 mt-12 border-t border-white/5">
                                <Link to="/admin/forms">
                                    <Button type="button" variant="outline" className="h-14 rounded-2xl px-10 text-[10px] font-black uppercase tracking-widest border-white/5 hover:bg-white/5">CANCEL</Button>
                                </Link>
                                <Button 
                                    onClick={handleSubmit} 
                                    disabled={saving}
                                    className="h-16 px-12 bg-neon-pink text-black font-black uppercase tracking-[0.3em] text-[12px] italic rounded-[1rem] shadow-[0_15px_40px_rgba(255,79,139,0.3)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-4 min-w-[240px]"
                                >
                                    {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                                    {id ? 'UPDATE' : 'CREATE'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Preview Column */}
                <div className="lg:sticky lg:top-32 space-y-8 w-full">
                    <div className="flex bg-zinc-950/60 border border-white/5 p-2 rounded-2xl w-fit backdrop-blur-3xl shadow-2xl">
                        <button 
                            onClick={() => setPreviewType('card')}
                            className={cn(
                                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                previewType === 'card' ? "bg-neon-pink text-black shadow-lg" : "text-gray-500 hover:text-white"
                            )}
                        >
                            CARD VIEW
                        </button>
                        <button 
                            onClick={() => setPreviewType('embed')}
                            className={cn(
                                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                previewType === 'embed' ? "bg-neon-pink text-black shadow-lg" : "text-gray-500 hover:text-white"
                            )}
                        >
                            EMBED VIEW
                        </button>
                    </div>


                    <div className="flex-grow pt-4">
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
