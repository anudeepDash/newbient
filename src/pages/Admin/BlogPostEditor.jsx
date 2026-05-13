import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Save from 'lucide-react/dist/esm/icons/save';
import X from 'lucide-react/dist/esm/icons/x';
import Image from 'lucide-react/dist/esm/icons/image';
import Type from 'lucide-react/dist/esm/icons/type';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Eye from 'lucide-react/dist/esm/icons/eye';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import User from 'lucide-react/dist/esm/icons/user';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { cn } from '../../lib/utils';

const BlogPostEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { posts, addPost, updatePost, user, addToast } = useStore();
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [previewScale, setPreviewScale] = useState(0.85);
    const [showPreviewMobile, setShowPreviewMobile] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const previewContainerRef = useRef(null);


    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        category: 'Live Events',
        coverImage: '',
        shortDescription: '',
        content: '',
        author: user?.displayName || 'Newbi Team',
        publishDate: new Date().toISOString().split('T')[0],
        status: 'Draft',
        featured: false,
        sendAsNewsletter: false,
        tags: '',
        coverImageScale: 1,
        coverImagePosX: 50,
        coverImagePosY: 50
    });

    useEffect(() => {
        if (id && posts.length > 0) {
            const post = posts.find(p => p.id === id);
            if (post) {
                setFormData({
                    ...post,
                    tags: post.tags ? post.tags.join(', ') : ''
                });
            }
        }
    }, [id, posts]);

    useEffect(() => {
        const handleResize = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.clientWidth;
                const scaleWidth = containerWidth / 1000;
                setPreviewScale(Math.max(0.1, Math.min(1.5, scaleWidth)));
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleTitleChange = (e) => {
        const title = e.target.value;
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        
        setFormData(prev => ({ ...prev, title, slug }));
    };

    const handleSave = async () => {
        if (!formData.title || !formData.slug) {
            addToast('TITLE_AND_SLUG_REQUIRED.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const finalData = {
                ...formData,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                readingTime: Math.ceil((formData.content?.split(' ').length || 0) / 200) || 1,
                updatedAt: new Date().toISOString()
            };

            if (id) {
                const oldPost = posts.find(p => p.id === id);
                await updatePost(id, finalData);
                if (finalData.status === 'Published' && oldPost?.status !== 'Published') {
                    await notifyAllUsers(
                        `New Article: ${finalData.title}`,
                        finalData.shortDescription || 'Check out our latest blog post!',
                        `/concertzone/${finalData.category?.toLowerCase().replace(' ', '-') || 'news'}/${finalData.slug}`,
                        finalData.coverImage
                    );
                }
            } else {
                await addPost({ ...finalData, createdAt: new Date().toISOString() });
                if (finalData.status === 'Published') {
                    await notifyAllUsers(
                        `New Article: ${finalData.title}`,
                        finalData.shortDescription || 'Check out our latest blog post!',
                        `/concertzone/${finalData.category?.toLowerCase().replace(' ', '-') || 'news'}/${finalData.slug}`,
                        finalData.coverImage
                    );
                }
            }
            addToast("STORY_ARCHIVED_SUCCESSFULLY.", 'success');
            navigate('/admin/blog');
        } catch (err) {
            console.error('Save failed:', err);
            addToast('SAVE_FAILED.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const categoryColors = {
        'Live Events': '#00F0FF',
        'Artists': '#A855F7',
        'Guides': '#39FF14',
        'Buzz': '#FF4F8B',
    };
    const accentColor = categoryColors[formData.category] || '#00F0FF';

    const generateAI = async (type) => {
        if (!formData.content && type !== 'title') {
            addToast("ADD_SOME_CONTENT_FIRST.", 'error');
            return;
        }
        
        setAiGenerating(true);
        try {
            // Placeholder for actual AI integration (matches ProposalGenerator pattern)
            // In a real scenario, this would call generateFullDocument or similar
            await new Promise(r => setTimeout(r, 1500)); 
            
            if (type === 'title') {
                const words = formData.content?.replace(/<[^>]*>/g, '').split(' ').slice(0, 5).join(' ').toUpperCase() || "NEW STORY";
                setFormData(prev => ({ ...prev, title: `${words} • THE DEFINITIVE ARCHIVE` }));
            } else if (type === 'seo') {
                const snippet = formData.content?.replace(/<[^>]*>/g, '').substring(0, 150) || "Explore the latest insights...";
                setFormData(prev => ({ ...prev, shortDescription: snippet + "..." }));
            }
            addToast("AI_SYNTHESIS_COMPLETE.", 'success');
        } catch (e) {
            addToast("AI_SERVICE_UNAVAILABLE.", 'error');
        } finally {
            setAiGenerating(false);
        }
    };

    const tabs = [
        { id: '1', label: 'Identity', icon: Type, desc: 'Story Naming' },
        { id: '2', label: 'Narrative', icon: FileText, desc: 'The Core Story' },
        { id: '3', label: 'Visuals', icon: Image, desc: 'Media Assets' },
        { id: '4', label: 'Discovery', icon: Sparkles, desc: 'SEO & Tags' },
        { id: '5', label: 'Status', icon: Settings, desc: 'Publishing Controls' }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-neon-blue selection:text-black font-['Outfit'] overflow-x-clip flex flex-col">
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Top Bar */}
            <header className="h-16 md:h-20 border-b border-white/5 bg-black/50 backdrop-blur-3xl flex items-center justify-between px-4 md:px-8 shrink-0 relative z-[100]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/blog')} className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all"><ChevronLeft size={18} /></button>
                    <div className="flex flex-col">
                        <h1 className="text-sm md:text-xl font-black tracking-tighter uppercase italic text-white leading-none">Content <span className="text-neon-blue">Architect.</span></h1>
                        <p className="text-[7px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Editorial Engine</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <button 
                        onClick={() => setShowPreviewMobile(!showPreviewMobile)} 
                        className="lg:hidden h-10 px-3 bg-neon-blue/10 rounded-xl border border-neon-blue/20 text-neon-blue flex items-center gap-2"
                    >
                        <Eye size={14} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Preview</span>
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="h-10 md:h-12 px-6 md:px-10 bg-neon-blue text-black font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-[0_10px_30px_rgba(0,255,255,0.3)] hover:scale-105 transition-all flex items-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        <span>Publish Changes</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className="hidden lg:flex w-64 border-r border-white/5 bg-zinc-900/20 flex-col p-6 gap-6 overflow-y-auto scrollbar-hide">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-4 mb-4">Workspace</p>
                        {tabs.map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)} 
                                className={cn(
                                    "w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left group",
                                    activeTab === tab.id ? "bg-white text-black shadow-xl" : "hover:bg-white/5 text-gray-500 hover:text-white"
                                )}
                            >
                                <div className={cn("p-2.5 rounded-xl transition-all", activeTab === tab.id ? "bg-black/20" : "bg-white/5 group-hover:bg-white/10")}>
                                    <tab.icon size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{tab.label}</p>
                                    <p className={cn("text-[9px] font-bold opacity-60 uppercase tracking-tighter", activeTab === tab.id ? "text-black" : "text-gray-600")}>{tab.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/5">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Live Status</span>
                            </div>
                            <p className="text-[10px] font-black uppercase text-white">{formData.status}</p>
                        </div>
                    </div>
                </aside>

                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto px-4 md:px-12 py-10 md:py-16 scrollbar-hide bg-[#050505]">
                    <div className="max-w-[800px] mx-auto space-y-12">
                        {/* Section Header */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-[2px] bg-neon-blue/40" />
                                <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] opacity-80">
                                    Phase {tabs.findIndex(t => t.id === activeTab) + 1} of {tabs.length}
                                </p>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic text-white leading-none">
                                {currentTab?.label}<span className="text-neon-blue">.</span>
                            </h2>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={activeTab} 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -10 }} 
                                transition={{ duration: 0.2 }}
                                className="space-y-10"
                            >
                                {activeTab === '1' && (
                                    <div className="space-y-10">

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Headline</label>
                                                <button onClick={() => generateAI('title')} className="text-[9px] font-black text-neon-blue uppercase tracking-widest flex items-center gap-1.5 hover:opacity-80">
                                                    <Sparkles size={10} /> Auto-Gen
                                                </button>
                                            </div>
                                            <textarea 
                                                value={formData.title} 
                                                onChange={handleTitleChange}
                                                placeholder="STORY HEADLINE..."
                                                className="w-full bg-zinc-900 border border-white/10 p-6 md:p-8 rounded-[2rem] text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none outline-none focus:border-neon-blue/40 transition-all min-h-[140px]"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === '2' && (
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between px-2 mb-2">
                                            <div className="flex items-center gap-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Word Count</span>
                                                    <span className="text-xs font-bold text-white">{(formData.content?.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length || 0)} WORDS</span>
                                                </div>
                                                <div className="w-px h-6 bg-white/10" />
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Est. Reading</span>
                                                    <span className="text-xs font-bold text-white">{Math.ceil((formData.content?.split(' ').length || 0) / 200) || 1} MIN</span>
                                                </div>
                                            </div>
                                        </div>
                                        <StudioRichEditor 
                                            label="The Story Canvas"
                                            value={formData.content}
                                            onChange={val => setFormData({ ...formData, content: val })}
                                            placeholder="Write something legendary..."
                                            minHeight="500px"
                                            accentColor="neon-blue"
                                        />
                                    </div>
                                )}

                                {activeTab === '3' && (
                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Cover Narrative</label>
                                            <div className="group relative aspect-video rounded-[3rem] overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/20 transition-all flex flex-col items-center justify-center text-gray-600 gap-4">
                                                {formData.coverImage ? (
                                                    <img 
                                                        src={formData.coverImage} 
                                                        className="w-full h-full" 
                                                        style={{ 
                                                            objectFit: 'cover', 
                                                            transform: `scale(${formData.coverImageScale || 1})`,
                                                            transformOrigin: `${formData.coverImagePosX || 50}% ${formData.coverImagePosY || 50}%`
                                                        }}
                                                        alt="Cover" 
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center"><Image size={24} /></div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest">Upload Master Visual</p>
                                                    </>
                                                )}
                                                <input 
                                                    type="file" 
                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            setIsUploading(true);
                                                            const url = await useStore.getState().uploadToCloudinary(file);
                                                            if (url) setFormData({ ...formData, coverImage: url, coverImageScale: 1, coverImagePosX: 50, coverImagePosY: 50 });
                                                            setIsUploading(false);
                                                        }
                                                    }}
                                                />
                                                {isUploading && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
                                                        <Loader2 className="animate-spin text-neon-blue" size={32} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {formData.coverImage && (
                                            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-8">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <Settings size={16} className="text-neon-blue" />
                                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Media Framing</h3>
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                        <span>Scale / Zoom</span>
                                                        <span className="text-neon-blue">{((formData.coverImageScale || 1) * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="1" max="3" step="0.05" 
                                                        value={formData.coverImageScale || 1} 
                                                        onChange={e => setFormData({ ...formData, coverImageScale: parseFloat(e.target.value) })}
                                                        className="w-full accent-neon-blue"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                            <span>Pan X (Horizontal)</span>
                                                            <span className="text-white">{formData.coverImagePosX || 50}%</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="0" max="100" step="1" 
                                                            value={formData.coverImagePosX || 50} 
                                                            onChange={e => setFormData({ ...formData, coverImagePosX: parseInt(e.target.value) })}
                                                            className="w-full accent-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                            <span>Pan Y (Vertical)</span>
                                                            <span className="text-white">{formData.coverImagePosY || 50}%</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="0" max="100" step="1" 
                                                            value={formData.coverImagePosY || 50} 
                                                            onChange={e => setFormData({ ...formData, coverImagePosY: parseInt(e.target.value) })}
                                                            className="w-full accent-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-white/5 flex justify-end">
                                                    <button 
                                                        onClick={() => setFormData({ ...formData, coverImageScale: 1, coverImagePosX: 50, coverImagePosY: 50 })}
                                                        className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                                                    >
                                                        Reset Framing
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === '4' && (
                                    <div className="space-y-12">
                                        {/* SEO Search Mockup */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Search Pulse Preview</label>
                                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-neon-blue font-black text-[10px]">N</div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-300 font-medium">Newbi Entertainment</span>
                                                        <span className="text-[8px] text-gray-500 truncate max-w-[200px]">https://newbi.live/concertzone/{formData.category?.toLowerCase()}/{formData.slug}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-xl md:text-2xl font-medium text-neon-blue hover:underline cursor-pointer truncate">{formData.title || 'Untitled Masterpiece'}</h3>
                                                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
                                                        {formData.shortDescription || 'Craft a compelling meta description in the field below to attract your audience from the digital void...'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SEO Fragment</label>
                                                <button onClick={() => generateAI('seo')} className="text-[9px] font-black text-neon-blue uppercase tracking-widest flex items-center gap-1.5 hover:opacity-80">
                                                    <Sparkles size={10} /> Summarize
                                                </button>
                                            </div>
                                            <textarea 
                                                value={formData.shortDescription} 
                                                onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                                                placeholder="Brief overview for the algorithm..."
                                                className="w-full bg-zinc-900 border border-white/10 p-6 rounded-3xl text-sm font-medium leading-relaxed outline-none focus:border-neon-blue/40 transition-all min-h-[120px] resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Category</label>
                                                <select 
                                                    value={formData.category} 
                                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full h-16 bg-zinc-900 border border-white/10 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-neon-blue/40"
                                                >
                                                    {['Live Events', 'Artists', 'Guides', 'Buzz'].map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Tags</label>
                                                <input 
                                                    value={formData.tags} 
                                                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                                    placeholder="VIBE, ENERGY, CULTURE..."
                                                    className="w-full h-16 bg-zinc-900 border border-white/10 px-6 rounded-2xl text-xs font-bold outline-none focus:border-neon-blue/40"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === '5' && (
                                    <div className="space-y-6">
                                        {[
                                            { key: 'status', label: 'Published State', desc: 'Visible to the general public', activeValue: 'Published', inactiveValue: 'Draft' },
                                            { key: 'featured', label: 'Hero Placement', desc: 'Pinned to the top of the grid', activeValue: true, inactiveValue: false },
                                            { key: 'sendAsNewsletter', label: 'Blast to Pulse', desc: 'Notify all email subscribers', activeValue: true, inactiveValue: false }
                                        ].map(control => (
                                            <button 
                                                key={control.key}
                                                onClick={() => setFormData({ 
                                                    ...formData, 
                                                    [control.key]: formData[control.key] === control.activeValue ? control.inactiveValue : control.activeValue 
                                                })}
                                                className={cn(
                                                    "w-full p-8 rounded-[2.5rem] border transition-all flex items-center justify-between text-left group",
                                                    formData[control.key] === control.activeValue 
                                                        ? "bg-neon-blue/10 border-neon-blue/20 text-white" 
                                                        : "bg-white/[0.02] border-white/5 text-gray-500 hover:bg-white/[0.04]"
                                                )}
                                            >
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest">{control.label}</p>
                                                    <p className="text-[9px] font-bold opacity-60 uppercase">{control.desc}</p>
                                                </div>
                                                <div className={cn(
                                                    "w-12 h-6 rounded-full p-1 transition-all",
                                                    formData[control.key] === control.activeValue ? "bg-neon-blue" : "bg-gray-800"
                                                )}>
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full bg-white transition-all transform",
                                                        formData[control.key] === control.activeValue ? "translate-x-6" : "translate-x-0"
                                                    )} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Preview Pane (Scaled Down) */}
                <aside className="hidden xl:flex w-[500px] border-l border-white/5 bg-black flex-col p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-8 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_rgba(0,255,0,0.5)]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Live Reality Preview</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Zoom</span>
                            <input type="range" min="0.5" max="1.5" step="0.05" value={previewScale} onChange={e => setPreviewScale(parseFloat(e.target.value))} className="w-24 accent-neon-blue" />
                        </div>
                    </div>

                    <div ref={previewContainerRef} className="flex-1 overflow-y-auto scrollbar-hide flex flex-col items-center bg-[#060606] rounded-[2rem] border border-white/5 relative">
                        <div 
                            style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }} 
                            className="w-[1000px] min-h-full bg-[#060606] shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Replicated BlogPostDetail Header */}
                            <header className="relative w-full h-[600px] flex flex-col justify-end overflow-hidden shrink-0">
                                <div className="absolute inset-0 overflow-hidden">
                                    {formData.coverImage ? (
                                        <img 
                                            src={formData.coverImage} 
                                            className="w-full h-full" 
                                            style={{ 
                                                objectFit: 'cover', 
                                                transform: `scale(${formData.coverImageScale || 1})`,
                                                transformOrigin: `${formData.coverImagePosX || 50}% ${formData.coverImagePosY || 50}%`
                                            }}
                                            alt="" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-gray-800 text-6xl font-black uppercase tracking-tighter">No Media</div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                                </div>

                                <div className="relative z-10 px-20 pb-20 w-full">
                                    <div className="max-w-4xl">
                                        <div className="flex items-center gap-6 mb-10">
                                            <span 
                                                className="px-8 py-3 text-black text-[13px] font-black uppercase tracking-widest rounded-2xl italic shadow-2xl"
                                                style={{ backgroundColor: accentColor }}
                                            >
                                                {formData.category}
                                            </span>
                                            <div className="h-px w-20 bg-white/20" />
                                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Preview Mode</span>
                                        </div>
                                        <h1 className="text-7xl font-black font-heading uppercase leading-[1.1] tracking-tight mb-12 italic pr-12">
                                            {(formData.title || 'UNTITLED MASTERPIECE').split(' ').map((word, i) => (
                                                <span key={i} 
                                                    className={i % 2 === 1 ? "text-transparent bg-clip-text not-italic" : "text-white"}
                                                    style={i % 2 === 1 ? { backgroundImage: `linear-gradient(to right, ${accentColor}, white, ${accentColor})` } : {}}
                                                >
                                                    {word}{' '}
                                                </span>
                                            ))}
                                        </h1>
                                        <div className="flex items-center gap-12 text-[13px] font-black uppercase tracking-[0.4em] text-white/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden"><User size={24} className="text-gray-500" /></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-600 mb-1 tracking-widest">AUTHOR</span>
                                                    <span className="text-white text-sm">{formData.author}</span>
                                                </div>
                                            </div>
                                            <div className="w-[1px] h-10 bg-white/10" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-600 mb-1 tracking-widest">PUBLISHED</span>
                                                <span className="text-white text-sm">{new Date(formData.publishDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </header>

                            <div className="p-20 pt-24 bg-[#060606]">
                                <div 
                                    className="prose prose-invert prose-2xl max-w-none prose-p:text-gray-400 prose-p:leading-relaxed prose-headings:uppercase prose-headings:italic prose-img:rounded-[3rem] prose-img:border prose-img:border-white/10"
                                    dangerouslySetInnerHTML={{ __html: formData.content }}
                                />
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Mobile Preview Modal */}
            <AnimatePresence>
                {showPreviewMobile && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black lg:hidden overflow-y-auto"
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-10">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neon-blue">Reality Preview</span>
                            <button onClick={() => setShowPreviewMobile(false)} className="p-2 bg-white/5 rounded-xl"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-8 pb-32">
                            <div className="space-y-4">
                                <span className="px-3 py-1 bg-neon-blue text-black text-[10px] font-black uppercase tracking-widest rounded-full italic">{formData.category}</span>
                                <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{formData.title || 'Untitled'}</h1>
                                <div className="flex items-center gap-4 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                    <span>{formData.author}</span>
                                    <span>•</span>
                                    <span>{Math.ceil((formData.content?.split(' ').length || 0) / 200)} MIN</span>
                                </div>
                            </div>
                            {formData.coverImage && <img src={formData.coverImage} className="w-full rounded-3xl border border-white/10" alt="Cover" />}
                            <div className="prose prose-invert text-gray-400" dangerouslySetInnerHTML={{ __html: formData.content }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BlogPostEditor;

