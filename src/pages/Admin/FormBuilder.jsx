import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, HelpCircle, ExternalLink, Smartphone, Monitor, LayoutGrid, Sparkles, Palette, Image as ImageIcon, Plus, X, Pin, FileText } from 'lucide-react'; 
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import { generateFullDocument } from '../../lib/ai';
import AIPromptBox from '../../components/admin/AIPromptBox';

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
    // Removed isCommunityForm
    const [requiresExternal, setRequiresExternal] = useState(false);
    const [showHelp, setShowHelp] = useState(false); // Toggle for help guide
    const [previewType, setPreviewType] = useState('card'); // 'card' or 'embed'
    const [image, setImage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [highlightColor, setHighlightColor] = useState('#FF4F8B');
    const [isPinned, setIsPinned] = useState(false);
    const [imageTransform, setImageTransform] = useState({ scale: 1.05, x: 0, y: 0 });
    const [isGenerating, setIsGenerating] = useState(false);
    const [promptBoxClear, setPromptBoxClear] = useState(false);

    useEffect(() => {
        if (id) {
            // Fix: Do NOT parseToInt. IDs are strings in Firestore.
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
            alert("UPLOAD FAILED. PLEASE TRY AGAIN.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleGenerateForm = async (prompt) => {
        setIsGenerating(true);
        try {
            const data = await generateFullDocument('form', prompt, 'Premium', {});
            if (data.title) setTitle(data.title);
            if (data.description) setDescription(data.description);
            if (data.activeLabel) setActiveLabel(data.activeLabel);
            if (data.bottomText) setBottomText(data.bottomText);
            if (data.buttonText) setButtonText(data.buttonText);
        } catch (error) {
            alert("AI Generation failed: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        // Extract src if user pasted full iframe code
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
            setPromptBoxClear(true);
            setTimeout(() => setPromptBoxClear(false), 100);
            navigate('/admin/forms');
        } catch (error) {
            console.error("Error saving form:", error);
            alert("Failed to save form. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-5%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 pt-24 md:pt-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-neon-pink" />
                                <span className="text-neon-pink text-[10px] font-black uppercase tracking-[0.4em]">Operations Hub</span>
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-4">
                            FORM <span className="text-neon-pink">MANAGEMENT.</span>
                        </h1>
                    </div>
                    
                    <div className="flex gap-4">
                        <Link to="/admin/forms">
                            <Button className="h-14 px-8 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white hover:text-black transition-all">
                                Cancel
                            </Button>
                        </Link>
                        <Button 
                            onClick={handleSubmit}
                            className="h-14 px-10 bg-neon-pink text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(255,79,139,0.2)] hover:scale-105 transition-all border-none"
                        >
                            <Save className="mr-2" size={18} /> SAVE CHANGES
                        </Button>
                    </div>
                </div>

                {/* AI Prompt Box for Form Generation */}
                <AIPromptBox onGenerate={handleGenerateForm} isGenerating={isGenerating} type="form" forceClear={promptBoxClear} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column: Builder */}
                    <div className="h-full">
                        <Card className="p-6 md:p-8 h-full flex flex-col">
                            <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Form Title</label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        placeholder="E.G. VOLUNTEER SIGN UP"
                                        className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-pink/40"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Status Badge</label>
                                        <select
                                            value={activeLabel}
                                            onChange={(e) => setActiveLabel(e.target.value)}
                                            className="w-full h-14 bg-black/50 border border-white/5 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-neon-pink/40 transition-all appearance-none"
                                        >
                                            <option value="Live">Live</option>
                                            <option value="Few Slots Remain">Few Slots Remain</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Location / Scope Details</label>
                                        <Input
                                            value={bottomText}
                                            onChange={(e) => setBottomText(e.target.value)}
                                            placeholder="Community Form"
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest focus:border-neon-pink/40"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Button Label</label>
                                        <Input
                                            value={buttonText}
                                            onChange={(e) => setButtonText(e.target.value)}
                                            placeholder="Take Form"
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest focus:border-neon-pink/40"
                                        />
                                    </div>
                                </div>

                                {/* SECTION 2: FORM DESCRIPTION */}
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <FileText size={16} className="text-neon-pink" /> FORM BRIEF / DESCRIPTION
                                    </label>
                                    <textarea
                                        className="w-full bg-black/60 border border-white/5 rounded-3xl p-8 text-white focus:outline-none focus:border-neon-pink/40 min-h-[160px] resize-none text-[13px] font-medium placeholder:text-gray-800 leading-relaxed shadow-inner"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the purpose of this form, what it collects, and any rules..."
                                    />
                                </div>

                                {/* SECTION 3: EMBED CONFIGURATION */}
                                <div className="p-8 rounded-3xl bg-black/40 border border-white/5 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-black uppercase tracking-[0.4em] text-neon-pink">Google Form Link</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowHelp(!showHelp)}
                                            className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1 underline"
                                        >
                                            <HelpCircle className="h-3 w-3" /> How to find this?
                                        </button>
                                    </div>

                                    {showHelp && (
                                        <div className="text-[11px] text-gray-400 bg-black/60 p-6 rounded-2xl border border-white/10 uppercase tracking-widest leading-loose">
                                            <ol className="list-decimal pl-4 space-y-2">
                                                <li>Open your Google Form in edit mode.</li>
                                                <li>Click the <strong className="text-white">Send</strong> button (top right).</li>
                                                <li>Click the <strong className="text-white">&lt; &gt;</strong> (Embed HTML) tab.</li>
                                                <li>Copy the URL inside <code>src="..."</code> OR paste the whole iframe code below.</li>
                                            </ol>
                                        </div>
                                    )}

                                    <Input
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                        required
                                        placeholder="HTTPS://DOCS.GOOGLE.COM/FORMS/D/E/.../VIEWFORM?EMBEDDED=TRUE"
                                        className="h-14 font-mono text-[9px] bg-black/50 border-white/5 rounded-xl px-6 focus:border-neon-pink/40"
                                    />
                                </div>

                                    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors bg-black/40 mb-6">
                                        <input
                                            type="checkbox"
                                            id="requiresExternal"
                                            checked={requiresExternal}
                                            onChange={(e) => setRequiresExternal(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-neon-pink focus:ring-neon-pink bg-black/50"
                                        />
                                        <div>
                                            <label htmlFor="requiresExternal" className="text-[11px] text-white font-black uppercase tracking-widest cursor-pointer flex items-center gap-2">
                                                Open in New Tab
                                                <ExternalLink className="h-3 w-3 text-gray-500" />
                                            </label>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
                                                Required for forms with <span className="text-white">File Uploads</span> or forced <span className="text-white">Google Sign-in</span>.
                                            </p>
                                        </div>
                                    </div>

                                    {/* PREMIUM BRANDING & MEDIA */}
                                    <div className="space-y-8 pt-6 border-t border-white/10">
                                        <label className="text-[11px] font-black text-neon-pink uppercase tracking-[0.4em] flex items-center gap-2">
                                            <Palette size={16} /> PREMIUM BRANDING & MEDIA
                                        </label>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">COVER ASSET</label>
                                                <div className="flex gap-4">
                                                    <div className="relative flex-1">
                                                        <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                                        <Input 
                                                            value={image} 
                                                            onChange={e => setImage(e.target.value)} 
                                                            placeholder="IMAGE_URL" 
                                                            className="pl-14 font-mono text-[9px] h-14 bg-black/40 border-white/5 rounded-xl focus:border-neon-pink/40" 
                                                        />
                                                    </div>
                                                    <div className="relative group w-14">
                                                        <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center border-2 border-dashed transition-all", isUploading ? "border-neon-pink bg-neon-pink/10 text-neon-pink" : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20")}>
                                                            {isUploading ? <Sparkles className="animate-spin" size={20} /> : <Plus size={20} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">THEME ACCENT COLOR</label>
                                                <div className="flex items-center gap-4 h-14 bg-black/40 border border-white/5 rounded-xl px-6">
                                                    {colorPresets.map(color => (
                                                        <button 
                                                            key={color.value} 
                                                            type="button" 
                                                            onClick={() => setHighlightColor(color.value)} 
                                                            className={cn(
                                                                "w-8 h-8 rounded-full border-2 transition-all relative hover:scale-110", 
                                                                highlightColor === color.value ? "border-white shadow-[0_0_15px_rgba(255,79,139,0.4)]" : "border-black/50"
                                                            )} 
                                                            style={{ backgroundColor: color.value }} 
                                                        />
                                                    ))}
                                                    <div className="w-[1px] h-6 bg-white/10 mx-2" />
                                                    <div className="relative w-8 h-8 rounded-full border-2 border-white/10 p-0.5 bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => document.getElementById('spectrum-picker').click()}>
                                                        <div className="w-full h-full rounded-full" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', transform: 'rotate(-45deg)' }} />
                                                        <input id="spectrum-picker" type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* IMAGE ADJUSTMENT ENGINE */}
                                    <div className="p-10 rounded-3xl bg-black/40 border border-white/5 space-y-10 my-8">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-neon-pink italic">Image Positioning</h4>
                                            <button 
                                                type="button" 
                                                onClick={() => setImageTransform({ scale: 1.05, x: 0, y: 0 })} 
                                                className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                                            >
                                                <X size={12} /> Reset Adjustment
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-2">
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Zoom Level</label>
                                                    <span className="text-[9px] font-mono text-neon-pink">{(imageTransform.scale).toFixed(2)}x</span>
                                                </div>
                                                <input type="range" min="0.5" max="2.5" step="0.01" value={imageTransform.scale} onChange={e => setImageTransform({ ...imageTransform, scale: parseFloat(e.target.value) })} className="w-full accent-neon-pink" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Pan X (Horizontal)</label>
                                                    <span className="text-[9px] font-mono text-neon-pink">{imageTransform.x}%</span>
                                                </div>
                                                <input type="range" min="-100" max="100" step="1" value={imageTransform.x} onChange={e => setImageTransform({ ...imageTransform, x: parseInt(e.target.value) })} className="w-full accent-neon-pink" />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Pan Y (Vertical)</label>
                                                    <span className="text-[9px] font-mono text-neon-pink">{imageTransform.y}%</span>
                                                </div>
                                                <input type="range" min="-100" max="100" step="1" value={imageTransform.y} onChange={e => setImageTransform({ ...imageTransform, y: parseInt(e.target.value) })} className="w-full accent-neon-pink" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SPOTLIGHT PIN */}
                                    <div className={cn(
                                        "p-10 rounded-[2.5rem] border flex items-center justify-between transition-all duration-500 mt-auto", 
                                        isPinned ? "bg-neon-pink/10 border-neon-pink/40 shadow-[0_0_40px_rgba(255,79,139,0.05)]" : "bg-black/40 border-white/5"
                                    )}>
                                        <div className="flex items-center gap-8">
                                            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl", isPinned ? "bg-neon-pink text-black" : "bg-white/5 text-gray-600")}>
                                                <Pin size={28} className={cn(isPinned && "fill-current")} />
                                            </div>
                                            <div>
                                                <h4 className="text-white text-sm font-black uppercase tracking-widest italic leading-tight">SPOTLIGHT PIN BROADCAST</h4>
                                                <p className="text-[10px] text-gray-600 mt-1 uppercase font-bold tracking-[0.1em]">Featured position in the Pulse Community Directory.</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsPinned(!isPinned)} 
                                            className={cn("w-16 h-9 rounded-full relative transition-all border-2", isPinned ? "bg-neon-pink border-neon-pink" : "bg-black/60 border-white/10")}
                                        >
                                            <div className={cn("absolute top-1 w-6 h-6 rounded-full transition-all shadow-lg", isPinned ? "right-1 bg-black" : "left-1 bg-gray-600")} />
                                        </button>
                                    </div>

                                <div className="flex justify-end pt-4 mt-auto">
                                    <Button type="submit" variant="primary" className="w-full sm:w-auto">
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Integration
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="h-full flex flex-col gap-8">
                        {/* Tab Toggle */}
                        {/* Tab Toggle */}
                        <div className="flex bg-zinc-900/60 border border-white/5 p-1.5 rounded-2xl w-fit backdrop-blur-xl">
                            <button 
                                onClick={() => setPreviewType('card')}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    previewType === 'card' ? "bg-neon-pink text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                Card View
                            </button>
                            <button 
                                onClick={() => setPreviewType('embed')}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    previewType === 'embed' ? "bg-neon-pink text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                Embed View
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
            </div>
        </div>
    );
};

export default FormBuilder;
