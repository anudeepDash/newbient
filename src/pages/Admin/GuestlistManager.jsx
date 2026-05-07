import React, { useState } from 'react';
import { Plus, Trash2, Edit, Save, Loader, Calendar, MapPin, Users, ArrowUp, ArrowDown, Megaphone, Sparkles, Palette, Image as ImageIcon, X, Pin, FileText, ListChecks, ChevronRight, UserCheck } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LivePreview from '../../components/admin/LivePreview';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { cn } from '../../lib/utils';
import StudioDatePicker from '../../components/ui/StudioDatePicker';
import StudioSelect from '../../components/ui/StudioSelect';

const GuestlistManager = () => {
    const colorPresets = [
        { name: 'Cyber Blue', value: '#2ebfff' },
        { name: 'Neon Green', value: '#39FF14' },
        { name: 'Neon Pink', value: '#FF4F8B' },
        { name: 'Electric Purple', value: '#BF00FF' },
    ];

    const { guestlists, addGuestlist, updateGuestlist, deleteGuestlist, uploadToCloudinary } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [previewType, setPreviewType] = useState('card');
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',
        description: '',
        status: 'Open',
        maxSpots: 100,
        currentSpots: 0,
        perUserLimit: 2,
        image: '',
        highlightColor: '#2ebfff',
        isPinned: false,
        imageTransform: { scale: 1.05, x: 0, y: 0 },
        guestlistEnabled: true // Always true for standalone GL
    });

    const resetForm = () => {
        setFormData({ 
            title: '', date: '', location: '', description: '', status: 'Open', maxSpots: 100, currentSpots: 0, perUserLimit: 2,
            image: '', highlightColor: '#2ebfff', isPinned: false, imageTransform: { scale: 1.05, x: 0, y: 0 }, guestlistEnabled: true
        });
        setIsAdding(false);
        setEditingId(null);
        setSaving(false);
        setIsUploading(false);
    };

    const handleEdit = (gl) => {
        setFormData({
            title: gl.title,
            date: gl.date || '',
            location: gl.location || '',
            description: gl.description || '',
            status: gl.status || 'Open',
            maxSpots: gl.maxSpots || 100,
            currentSpots: gl.currentSpots || 0,
            perUserLimit: gl.perUserLimit || 2,
            image: gl.image || '',
            highlightColor: gl.highlightColor || '#2ebfff',
            isPinned: gl.isPinned || false,
            imageTransform: gl.imageTransform || { scale: 1.05, x: 0, y: 0 },
            guestlistEnabled: true
        });
        setEditingId(gl.id);
        setIsAdding(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const glData = { ...formData };
            if (editingId) {
                await updateGuestlist(editingId, glData);
            } else {
                await addGuestlist(glData);
            }
            resetForm();
            useStore.getState().addToast(`Guestlist ${editingId ? 'updated' : 'created'} successfully!`, 'success');
        } catch (error) {
            console.error(error);
            useStore.getState().addToast(`Error saving guestlist: ${error.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, image: url }));
        } catch (error) {
            console.error("Upload failed:", error);
            useStore.getState().addToast("UPLOAD FAILED.", 'error');
        } finally {
            setIsUploading(false);
        }
    };

    if (isAdding) {
        return (
            <AdminCommunityHubLayout 
                hideTabs 
                studioHeader={{
                    title: "GUESTLIST",
                    subtitle: editingId ? "EDITOR" : "CREATOR",
                    accentClass: "text-neon-blue"
                }}
            >
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 items-start mb-20">
                    {/* Editor Column */}
                    <div className="w-full">
                        <Card className="p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] shadow-2xl h-full flex flex-col">
                            <form onSubmit={handleSave} className="space-y-10 flex-grow flex flex-col">
                                {/* SECTION 1: IDENTITY & STATUS */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">EVENT TITLE</label>
                                        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required 
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">STATUS</label>
                                        <StudioSelect
                                            value={formData.status}
                                            options={[
                                                { value: 'Open', label: 'OPEN' },
                                                { value: 'Filling Fast', label: 'FILLING FAST' },
                                                { value: 'Closed', label: 'CLOSED' }
                                            ]}
                                            onChange={val => setFormData({ ...formData, status: val })}
                                            className="h-14"
                                            accentColor="neon-blue"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">EVENT DATE</label>
                                        <StudioDatePicker 
                                            value={formData.date} 
                                            onChange={(val) => setFormData({ ...formData, date: val })} 
                                            className="h-14"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">LOCATION</label>
                                        <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required 
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" />
                                    </div>
                                </div>

                                {/* SECTION 2: CAPACITY CONFIG */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">MAX CAPACITY</label>
                                        <Input type="number" value={formData.maxSpots} onChange={e => setFormData({ ...formData, maxSpots: parseInt(e.target.value) })} required 
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">PER USER LIMIT</label>
                                        <Input type="number" value={formData.perUserLimit} onChange={e => setFormData({ ...formData, perUserLimit: parseInt(e.target.value) })} required 
                                            className="h-14 bg-black/50 border-white/5 rounded-xl px-6 text-[11px] font-black uppercase tracking-widest focus:border-neon-blue/40" />
                                    </div>
                                </div>

                                {/* SECTION 3: MISSION BRIEF */}
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                        <FileText size={16} className="text-neon-blue" /> DESCRIPTION / TERMS
                                    </label>
                                    <textarea 
                                        className="w-full bg-black/60 border border-white/5 rounded-3xl p-8 text-white focus:outline-none focus:border-neon-blue/40 min-h-[150px] resize-none text-[13px] font-medium placeholder:text-gray-800 leading-relaxed" 
                                        value={formData.description} 
                                        onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                        placeholder="Rules of entry, age limits, dress code..." 
                                    />
                                </div>

                                {/* PREMIUM BRANDING & MEDIA */}
                                <div className="space-y-8 pt-6 border-t border-white/10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">COVER ASSET</label>
                                            <div className="flex gap-4">
                                                <Input 
                                                    value={formData.image} 
                                                    onChange={e => setFormData({ ...formData, image: e.target.value })} 
                                                    placeholder="IMAGE_URL" 
                                                    className="flex-1 h-14 bg-black/40 border-white/5 rounded-xl focus:border-neon-blue/40" 
                                                />
                                                <div className="relative group w-14">
                                                    <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                    <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center border-2 border-dashed transition-all", isUploading ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20")}>
                                                        {isUploading ? <Loader className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">ACCENT COLOR</label>
                                            <div className="flex items-center gap-4 h-14 bg-black/40 border border-white/5 rounded-xl px-6">
                                                {colorPresets.map(color => (
                                                    <button 
                                                        key={color.value} 
                                                        type="button" 
                                                        onClick={() => setFormData({ ...formData, highlightColor: color.value })} 
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 transition-all hover:scale-110", 
                                                            formData.highlightColor === color.value ? "border-white shadow-[0_0_15px_rgba(46,191,255,0.4)]" : "border-black/50"
                                                        )} 
                                                        style={{ backgroundColor: color.value }} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-auto border-t border-white/10">
                                    <Button type="button" variant="outline" onClick={resetForm} className="h-14 rounded-2xl w-full sm:w-auto">Cancel</Button>
                                    <Button 
                                        type="submit" 
                                        disabled={saving}
                                        className="h-14 md:h-20 px-8 md:px-16 bg-neon-blue text-black font-black uppercase tracking-[0.3em] text-[10px] md:text-[12px] italic rounded-xl md:rounded-[1.5rem] shadow-[0_15px_40px_rgba(46,191,255,0.3)] hover:scale-105 active:scale-95 transition-all border-none flex items-center justify-center gap-3 w-full sm:min-w-[240px]"
                                    >
                                        {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                                        {editingId ? 'UPDATE GUESTLIST' : 'CREATE GUESTLIST'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Preview Column */}
                    <div className="lg:sticky lg:top-32 space-y-8 w-full">
                        <div className="flex bg-zinc-900/60 border border-white/5 p-1.5 rounded-2xl w-fit backdrop-blur-xl">
                            <button onClick={() => setPreviewType('card')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", previewType === 'card' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white")}>Card View</button>
                            <button onClick={() => setPreviewType('embed')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", previewType === 'embed' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white")}>Embed View</button>
                        </div>
                        <LivePreview type="gl" data={formData} hideDecorations={false} />
                    </div>
                </div>
            </AdminCommunityHubLayout>
        );
    }

    return (
        <AdminCommunityHubLayout 
            title="Guestlist Management" 
            description="Manage verified entry lists for exclusive events and community gatherings."
            studioHeader={{
                title: "GUESTLIST",
                subtitle: "VAULT",
                accentClass: "text-neon-blue"
            }}
        >
            <div className="max-w-[1400px] mx-auto pb-32">
                <div className="flex justify-end mb-12">
                    <Button onClick={() => setIsAdding(true)} className="h-16 md:h-20 px-8 md:px-16 bg-neon-blue text-black font-black uppercase tracking-[0.3em] text-[10px] md:text-[12px] rounded-xl md:rounded-[1.5rem] shadow-[0_15px_40px_rgba(46,191,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <Plus size={24} /> New Guestlist
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {guestlists && guestlists.length > 0 ? (
                        guestlists.map((gl) => (
                            <Card key={gl.id} className="p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] hover:border-neon-blue/30 transition-all duration-500">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">{gl.title}</h3>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            gl.status === 'Open' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                        )}>
                                            {gl.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">
                                        <span className="flex items-center gap-2"><Calendar size={14} className="text-neon-blue" /> {gl.date || 'TBD'}</span>
                                        <span className="flex items-center gap-2"><MapPin size={14} className="text-neon-blue" /> {gl.location || 'VENUE'}</span>
                                        <span className="flex items-center gap-2"><Users size={14} className="text-neon-blue" /> {gl.currentSpots || 0} / {gl.maxSpots || '∞'} SPOTS</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full lg:w-auto ml-auto">
                                    <Button variant="outline" className="h-12 px-6 rounded-xl border-white/10 hover:bg-neon-blue hover:text-black flex items-center gap-2 group">
                                        <UserCheck size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Entries</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                    <Button variant="outline" onClick={() => handleEdit(gl)} className="h-12 w-12 rounded-xl border-white/10 hover:bg-white hover:text-black transition-all">
                                        <Edit size={18} />
                                    </Button>
                                    <Button variant="outline" onClick={() => deleteGuestlist(gl.id)} className="h-12 w-12 rounded-xl text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="py-20 text-center text-gray-500 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                            <ListChecks size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="uppercase font-black tracking-widest text-[10px]">No active guestlists found.</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default GuestlistManager;
