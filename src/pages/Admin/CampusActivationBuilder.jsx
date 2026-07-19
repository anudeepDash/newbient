import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Plus, Trash2, ArrowLeft, Save, Star, Image as ImageIcon, Copy, ExternalLink, Hash } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { cn } from '../../lib/utils';
import GlobalLoader from '../../components/ui/GlobalLoader';

const CampusActivationBuilder = () => {
    useStoreSubscription(['campusActivations']);
    useDynamicMeta({ title: "Campaign Builder" });
    const { id } = useParams();
    const navigate = useNavigate();
    const { addCampusActivation, updateCampusActivation, campusActivations } = useStore();
    
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        brandName: '',
        brandLogo: '',
        primaryColor: '#00F0FF',
        description: '',
        tasks: []
    });

    useEffect(() => {
        if (id && campusActivations) {
            const existing = campusActivations.find(a => a.id === id);
            if (existing) setFormData(existing);
        }
    }, [id, campusActivations]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, brandLogo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const generateSlug = () => {
        const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        setFormData(prev => ({ ...prev, slug }));
    };

    const addTask = () => {
        setFormData(prev => ({
            ...prev,
            tasks: [...prev.tasks, { id: Date.now().toString(), type: 'online', title: '', description: '', points: 50, link: '' }]
        }));
    };

    const updateTask = (taskId, field, value) => {
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t)
        }));
    };

    const removeTask = (taskId) => {
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.filter(t => t.id !== taskId)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (id) {
                await updateCampusActivation(id, formData);
            } else {
                await addCampusActivation(formData);
            }
            navigate('/admin/campus');
        } catch (error) {
            console.error("Error saving campaign:", error);
            alert("Failed to save campaign.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F17] text-white font-['Outfit'] pt-24 pb-32">
            <header className="sticky top-0 z-40 bg-[#0B0F17]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/admin/campus" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-black uppercase tracking-tight">
                            {id ? 'Edit' : 'New'} <span className="text-neon-purple">Gamified Campaign</span>
                        </h1>
                    </div>
                    <button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="h-10 px-6 bg-neon-purple text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Save size={16} /> Save Campaign
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                    {/* Basic Info */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                        <h2 className="text-lg font-bold border-b border-white/10 pb-4">Brand & Campaign Basics</h2>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Campaign Title</label>
                                <input 
                                    type="text" name="title" value={formData.title} onChange={handleChange} onBlur={generateSlug}
                                    className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 focus:border-neon-purple focus:outline-none"
                                    placeholder="e.g. Redbull Rush Campus Tour"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">URL Slug</label>
                                <div className="flex items-center">
                                    <span className="h-12 px-4 bg-black/50 border border-white/10 border-r-0 rounded-l-xl flex items-center text-zinc-500 text-sm">/campus/activation/</span>
                                    <input 
                                        type="text" name="slug" value={formData.slug} onChange={handleChange}
                                        className="w-full h-12 bg-black border border-white/10 rounded-r-xl px-4 focus:border-neon-purple focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Brand Name</label>
                                <input 
                                    type="text" name="brandName" value={formData.brandName} onChange={handleChange}
                                    className="w-full h-12 bg-black border border-white/10 rounded-xl px-4 focus:border-neon-purple focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Primary Brand Color (Hex)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" name="primaryColor" value={formData.primaryColor} onChange={handleChange}
                                        className="h-12 w-16 bg-black border border-white/10 rounded-xl cursor-pointer"
                                    />
                                    <input 
                                        type="text" name="primaryColor" value={formData.primaryColor} onChange={handleChange}
                                        className="flex-1 h-12 bg-black border border-white/10 rounded-xl px-4 focus:border-neon-purple focus:outline-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Campaign Description</label>
                            <textarea 
                                name="description" value={formData.description} onChange={handleChange} rows={3}
                                className="w-full bg-black border border-white/10 rounded-xl p-4 focus:border-neon-purple focus:outline-none resize-none"
                                placeholder="Describe the activation..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Brand Logo</label>
                            <div className="flex items-center gap-4">
                                {formData.brandLogo ? (
                                    <img src={formData.brandLogo} alt="Logo" className="w-20 h-20 object-contain bg-white rounded-xl p-2" />
                                ) : (
                                    <div className="w-20 h-20 bg-black border border-white/10 rounded-xl flex items-center justify-center text-zinc-600">
                                        <ImageIcon size={24} />
                                    </div>
                                )}
                                <label className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest rounded-xl flex items-center cursor-pointer transition-colors">
                                    Upload Logo
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Gamification Tasks */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Star className="text-neon-purple" /> Gamification Tasks
                            </h2>
                            <button onClick={addTask} className="h-8 px-4 bg-neon-purple/20 text-neon-purple text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-neon-purple hover:text-black transition-colors">
                                <Plus size={14} /> Add Task
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.tasks.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8 border border-dashed border-white/10 rounded-xl">No tasks added yet. Create online/offline missions for students to earn points.</p>
                            ) : (
                                formData.tasks.map((task, index) => (
                                    <div key={task.id} className="p-4 bg-black border border-white/10 rounded-2xl relative group">
                                        <button onClick={() => removeTask(task.id)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="grid md:grid-cols-12 gap-4">
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Type</label>
                                                <select 
                                                    value={task.type} onChange={(e) => updateTask(task.id, 'type', e.target.value)}
                                                    className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm focus:outline-none focus:border-neon-purple"
                                                >
                                                    <option value="online">Online Mission</option>
                                                    <option value="offline">Offline Activation</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-6">
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Task Title</label>
                                                <input 
                                                    type="text" value={task.title} onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                                                    className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm focus:outline-none focus:border-neon-purple"
                                                    placeholder={task.type === 'online' ? "e.g. Share our post on your story" : "e.g. Check in at the Redbull Booth"}
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Points</label>
                                                <input 
                                                    type="number" value={task.points} onChange={(e) => updateTask(task.id, 'points', Number(e.target.value))}
                                                    className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm focus:outline-none focus:border-neon-purple text-neon-purple font-black"
                                                />
                                            </div>
                                            <div className="md:col-span-12">
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Action Link (Optional)</label>
                                                <input 
                                                    type="url" value={task.link} onChange={(e) => updateTask(task.id, 'link', e.target.value)}
                                                    className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm focus:outline-none focus:border-neon-purple"
                                                    placeholder="https://instagram.com/..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </form>
            </main>
            {isLoading && <GlobalLoader color="#B200FF" />}
        </div>
    );
};

export default CampusActivationBuilder;
