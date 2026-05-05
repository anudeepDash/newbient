import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    Save, 
    X, 
    Image, 
    Type, 
    Link as LinkIcon, 
    Bold, 
    Italic, 
    Heading2, 
    Heading3, 
    List,
    Eye,
    ChevronLeft,
    Loader2,
    Calendar,
    User,
    Mail,
    Star,
    Settings,
    Upload
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import StudioRichEditor from '../../components/ui/StudioRichEditor';

const BlogPostEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { posts, addPost, updatePost } = useStore();
    const contentRef = useRef(null);
    const fileInputRef = useRef(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isContentUploading, setIsContentUploading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    // Cloudinary Config from GalleryManager
    const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dgtalrz4n/image/upload";
    const UPLOAD_PRESET = "maw1e4ud";

    const handleFileUpload = async (file) => {
        if (!file) return null;
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET);

        try {
            const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
            const uploadedImage = await res.json();
            return uploadedImage.secure_url;
        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed. please check your connection.");
            return null;
        }
    };
    
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        category: 'Live Events',
        coverImage: '',
        shortDescription: '',
        content: '',
        author: 'Newbi Team',
        publishDate: new Date().toISOString().split('T')[0],
        status: 'Draft',
        featured: false,
        sendAsNewsletter: false,
        tags: ''
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

    const handleTitleChange = (e) => {
        const title = e.target.value;
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        
        setFormData(prev => ({ ...prev, title, slug }));
    };

    const insertTag = (tag, closingTag = '') => {
        const newContent = formData.content + tag + (closingTag || tag.replace('<', '</'));
        setFormData(prev => ({ ...prev, content: newContent }));
    };

    const handleContentImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsContentUploading(true);
        const url = await handleFileUpload(file);
        if (url) {
            insertTag(`<img src="${url}" class="w-full rounded-[2rem] my-12 border border-white/5 shadow-2xl" />`, ' ');
        }
        setIsContentUploading(false);
        e.target.value = ''; // Reset input
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.slug) {
            alert('Title and Slug are required.');
            return;
        }

        setIsSaving(true);
        try {
            const finalData = {
                ...formData,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                readingTime: Math.ceil(formData.content.split(' ').length / 200)
            };

            if (id) {
                const oldPost = posts.find(p => p.id === id);
                await updatePost(id, finalData);
                // Trigger notification if status changed to Published
                if (finalData.status === 'Published' && oldPost?.status !== 'Published') {
                    await notifyAllUsers(
                        `New Article: ${finalData.title}`,
                        finalData.shortDescription || 'Check out our latest blog post!',
                        `/blog/${finalData.slug}`,
                        finalData.coverImage
                    );
                }
            } else {
                await addPost(finalData);
                // Trigger notification for new blog post if published
                if (finalData.status === 'Published') {
                    await notifyAllUsers(
                        `New Article: ${finalData.title}`,
                        finalData.shortDescription || 'Check out our latest blog post!',
                        `/blog/${finalData.slug}`,
                        finalData.coverImage
                    );
                }
            }
            navigate('/admin/blog');
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save post.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-32">
            <div className="max-w-[1400px] mx-auto px-6">
                
                {/* Fixed Top Bar */}
                <div className="flex flex-wrap justify-between items-center mb-12 gap-6 pb-8 border-b border-white/10">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/admin/blog')} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                                <ChevronLeft size={20} />
                            </button>
                            <AdminDashboardLink className="hidden md:flex" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black font-heading uppercase tracking-tighter italic">
                                {id ? 'EDIT' : 'CREATE'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">ARTICLE.</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`h-12 px-6 rounded-2xl border flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all ${
                                previewMode ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:border-white/20'
                            }`}
                        >
                            <Eye size={16} /> {previewMode ? 'Editor' : 'Preview'}
                        </button>
                        <Button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-14 px-10 bg-neon-blue text-black font-black font-heading uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(0,255,255,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} className="mr-2" /> Save Post</>}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {previewMode ? (
                            <Card className="p-12 bg-zinc-900 border-white/5 rounded-[2.5rem] min-h-[600px]">
                                <img src={formData.coverImage} className="w-full aspect-video object-cover rounded-3xl mb-12 border border-white/5" alt="" />
                                <h1 className="text-4xl md:text-6xl font-black font-heading uppercase mb-8">{formData.title}</h1>
                                <div className="article-content" dangerouslySetInnerHTML={{ __html: formData.content }} />
                            </Card>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Article Title</label>
                                    <input
                                        type="text"
                                        placeholder="Enter a killer title..."
                                        value={formData.title}
                                        onChange={handleTitleChange}
                                        className="w-full h-16 bg-zinc-900/50 border border-white/10 rounded-2xl px-8 text-2xl font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-neon-blue/50 transition-all font-heading uppercase"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Slug (URL Permanent ID)</label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-mono text-neon-blue focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Short Description (SEO Snippet)</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Sum up the vibe in 150 characters..."
                                        value={formData.shortDescription}
                                        onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                                        className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-6 font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-neon-blue/50 transition-all"
                                    />
                                </div>

                                <StudioRichEditor 
                                    label="Main Article Content"
                                    value={formData.content}
                                    onChange={val => setFormData(prev => ({ ...prev, content: val }))}
                                    placeholder="Write your masterpiece here..."
                                    minHeight="500px"
                                />
                            </>
                        )}
                    </div>

                    {/* Sidebar / Sidebar Settings */}
                    <div className="space-y-8">
                        <Card className="p-8 bg-zinc-900/40 border-white/5 rounded-[2.5rem] sticky top-32">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                                <Settings size={16} className="text-neon-blue" /> Post Settings
                            </h3>

                            <div className="space-y-6">
                                {/* Cover Image Preview */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center justify-between">
                                        Cover Image 
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                                onChange={async (e) => {
                                                    const url = await handleFileUpload(e.target.files[0]);
                                                    if (url) setFormData(prev => ({ ...prev, coverImage: url }));
                                                }}
                                            />
                                            <span className="text-neon-blue cursor-pointer hover:underline">Upload</span>
                                        </div>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Or paste URL https://..."
                                        value={formData.coverImage}
                                        onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none"
                                    />
                                    {formData.coverImage && (
                                        <div className="mt-4 aspect-video rounded-xl overflow-hidden border border-white/10">
                                            <img src={formData.coverImage} className="w-full h-full object-cover" alt="Preview" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full h-12 bg-zinc-900 border border-white/10 rounded-xl px-4 text-xs font-black uppercase tracking-widest focus:outline-none"
                                    >
                                        {['Live Events', 'Artists', 'Guides', 'Buzz'].map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Author Name</label>
                                    <input
                                        type="text"
                                        value={formData.author}
                                        onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Publish Date</label>
                                    <input
                                        type="date"
                                        value={formData.publishDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, publishDate: e.target.value }))}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tags (Comma separated)</label>
                                    <input
                                        type="text"
                                        placeholder="rock, lollapalooza, Mumbai"
                                        value={formData.tags}
                                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-10 h-6 rounded-full p-1 transition-all ${formData.status === 'Published' ? 'bg-neon-green' : 'bg-zinc-700'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${formData.status === 'Published' ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.status === 'Published'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.checked ? 'Published' : 'Draft' }))}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Publish Live</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-10 h-6 rounded-full p-1 transition-all ${formData.featured ? 'bg-neon-pink' : 'bg-zinc-700'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${formData.featured ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.featured}
                                            onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <Star size={10} className={formData.featured ? 'text-white' : 'text-gray-500'} /> Featured Story
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-10 h-6 rounded-full p-1 transition-all ${formData.sendAsNewsletter ? 'bg-neon-blue' : 'bg-zinc-700'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${formData.sendAsNewsletter ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.sendAsNewsletter}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sendAsNewsletter: e.target.checked }))}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <Mail size={10} /> Send as Newsletter
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogPostEditor;
